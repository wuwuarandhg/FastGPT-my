import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authUser, authApp, authShareChat, AuthUserTypeEnum } from '@/service/utils/auth';
import { sseErrRes, jsonRes } from '@/service/response';
import { withNextCors } from '@/service/utils/tools';
import { ChatRoleEnum, ChatSourceEnum, sseResponseEventEnum } from '@/constants/chat';
import {
  dispatchHistory,
  dispatchChatInput,
  dispatchChatCompletion,
  dispatchKBSearch,
  dispatchAnswer,
  dispatchClassifyQuestion,
  dispatchContentExtract,
  dispatchHttpRequest
} from '@/service/moduleDispatch';
import type { CreateChatCompletionRequest } from 'openai';
import { gptMessage2ChatType, textAdaptGptResponse } from '@/utils/adapt';
import { getChatHistory } from './getHistory';
import { saveChat } from '@/service/utils/chat/saveChat';
import { sseResponse } from '@/service/utils/tools';
import { type ChatCompletionRequestMessage } from 'openai';
import { TaskResponseKeyEnum } from '@/constants/chat';
import { FlowModuleTypeEnum, initModuleType } from '@/constants/flow';
import { AppModuleItemType, RunningModuleItemType } from '@/types/app';
import { pushTaskBill } from '@/service/events/pushBill';
import { BillSourceEnum } from '@/constants/user';
import { ChatHistoryItemResType } from '@/types/chat';
import { UserModelSchema } from '@/types/mongoSchema';

export type MessageItemType = ChatCompletionRequestMessage & { _id?: string };
type FastGptWebChatProps = {
  chatId?: string; // undefined: nonuse history, '': new chat, 'xxxxx': use history
  appId?: string;
};
type FastGptShareChatProps = {
  shareId?: string;
};
export type Props = CreateChatCompletionRequest &
  FastGptWebChatProps &
  FastGptShareChatProps & {
    messages: MessageItemType[];
    stream?: boolean;
    detail?: boolean;
    variables: Record<string, any>;
  };
export type ChatResponseType = {
  newChatId: string;
  quoteLen?: number;
};

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.on('close', () => {
    res.end();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  let {
    chatId,
    appId,
    shareId,
    stream = false,
    detail = false,
    messages = [],
    variables = {}
  } = req.body as Props;

  try {
    if (!messages) {
      throw new Error('Prams Error');
    }
    if (!Array.isArray(messages)) {
      throw new Error('messages is not array');
    }

    await connectToDatabase();
    let startTime = Date.now();

    /* user auth */
    const {
      user,
      userId,
      appId: authAppid,
      authType
    } = await (shareId
      ? authShareChat({
          shareId
        })
      : authUser({ req, authBalance: true }));

    if (!user) {
      throw new Error('Account is error');
    }
    if (authType === AuthUserTypeEnum.apikey || shareId) {
      user.openaiAccount = undefined;
    }

    appId = appId ? appId : authAppid;
    if (!appId) {
      throw new Error('appId is empty');
    }

    // auth app, get history
    const [{ app }, { history }] = await Promise.all([
      authApp({
        appId,
        userId
      }),
      getChatHistory({ chatId, userId })
    ]);

    const isOwner = !shareId && userId === String(app.userId);

    const prompts = history.concat(gptMessage2ChatType(messages));
    if (prompts[prompts.length - 1].obj === 'AI') {
      prompts.pop();
    }
    // user question
    const prompt = prompts.pop();
    if (!prompt) {
      throw new Error('Question is empty');
    }

    // 创建响应流
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
    }

    /* start process */
    const { responseData, answerText } = await dispatchModules({
      res,
      modules: app.modules,
      user,
      variables,
      params: {
        history: prompts,
        userChatInput: prompt.value
      },
      stream,
      detail
    });
    // console.log(responseData, '===', answerText);

    // if (!answerText) {
    //   throw new Error('回复内容为空，可能模块编排出现问题');
    // }

    // save chat
    if (chatId) {
      await saveChat({
        chatId,
        appId,
        userId,
        variables,
        isOwner,
        shareId,
        source: (() => {
          if (shareId) {
            return ChatSourceEnum.share;
          }
          if (authType === 'apikey') {
            return ChatSourceEnum.api;
          }
          return ChatSourceEnum.online;
        })(),
        content: [
          prompt,
          {
            _id: messages[messages.length - 1]._id,
            obj: ChatRoleEnum.AI,
            value: answerText,
            responseData
          }
        ]
      });
    }

    console.log(`finish time: ${(Date.now() - startTime) / 1000}s`);

    if (stream) {
      sseResponse({
        res,
        event: detail ? sseResponseEventEnum.answer : undefined,
        data: textAdaptGptResponse({
          text: null,
          finish_reason: 'stop'
        })
      });
      sseResponse({
        res,
        event: detail ? sseResponseEventEnum.answer : undefined,
        data: '[DONE]'
      });

      if (isOwner && detail) {
        sseResponse({
          res,
          event: sseResponseEventEnum.appStreamResponse,
          data: JSON.stringify(responseData)
        });
      }

      res.end();
    } else {
      res.json({
        ...(detail ? { responseData } : {}),
        id: chatId || '',
        model: '',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 1 },
        choices: [
          {
            message: { role: 'assistant', content: answerText },
            finish_reason: 'stop',
            index: 0
          }
        ]
      });
    }

    pushTaskBill({
      appName: app.name,
      appId,
      userId,
      source: (() => {
        if (authType === 'apikey') return BillSourceEnum.api;
        if (shareId) return BillSourceEnum.shareLink;
        return BillSourceEnum.fastgpt;
      })(),
      response: responseData,
      shareId
    });
  } catch (err: any) {
    if (stream) {
      sseErrRes(res, err);
      res.end();
    } else {
      jsonRes(res, {
        code: 500,
        error: err
      });
    }
  }
});

export async function dispatchModules({
  res,
  modules,
  user,
  params = {},
  variables = {},
  stream = false,
  detail = false
}: {
  res: NextApiResponse;
  modules: AppModuleItemType[];
  user?: UserModelSchema;
  params?: Record<string, any>;
  variables?: Record<string, any>;
  stream?: boolean;
  detail?: boolean;
}) {
  const runningModules = loadModules(modules, variables);

  // let storeData: Record<string, any> = {}; // after module used
  let chatResponse: ChatHistoryItemResType[] = []; // response request and save to database
  let chatAnswerText = ''; // AI answer

  function pushStore({
    answerText = '',
    responseData
  }: {
    answerText?: string;
    responseData?: ChatHistoryItemResType;
  }) {
    responseData && chatResponse.push(responseData);
    chatAnswerText += answerText;
  }
  function moduleInput(
    module: RunningModuleItemType,
    data: Record<string, any> = {}
  ): Promise<any> {
    const checkInputFinish = () => {
      return !module.inputs.find((item: any) => item.value === undefined);
    };
    const updateInputValue = (key: string, value: any) => {
      const index = module.inputs.findIndex((item: any) => item.key === key);
      if (index === -1) return;
      module.inputs[index].value = value;
    };

    const set = new Set();

    return Promise.all(
      Object.entries(data).map(([key, val]: any) => {
        updateInputValue(key, val);

        if (!set.has(module.moduleId) && checkInputFinish()) {
          set.add(module.moduleId);
          return moduleRun(module);
        }
      })
    );
  }
  function moduleOutput(
    module: RunningModuleItemType,
    result: Record<string, any> = {}
  ): Promise<any> {
    pushStore(result);
    return Promise.all(
      module.outputs.map((outputItem) => {
        if (result[outputItem.key] === undefined) return;
        /* update output value */
        outputItem.value = result[outputItem.key];

        /* update target */
        return Promise.all(
          outputItem.targets.map((target: any) => {
            // find module
            const targetModule = runningModules.find((item) => item.moduleId === target.moduleId);
            if (!targetModule) return;
            return moduleInput(targetModule, { [target.key]: outputItem.value });
          })
        );
      })
    );
  }
  async function moduleRun(module: RunningModuleItemType): Promise<any> {
    if (res.closed) return Promise.resolve();
    console.log('run=========', module.flowType);

    if (stream && detail && module.showStatus) {
      responseStatus({
        res,
        name: module.name,
        status: 'running'
      });
    }

    // get fetch params
    const params: Record<string, any> = {};
    module.inputs.forEach((item: any) => {
      params[item.key] = item.value;
    });
    const props: Record<string, any> = {
      res,
      stream,
      detail,
      userOpenaiAccount: user?.openaiAccount,
      ...params
    };

    const dispatchRes = await (async () => {
      const callbackMap: Record<string, Function> = {
        [FlowModuleTypeEnum.historyNode]: dispatchHistory,
        [FlowModuleTypeEnum.questionInput]: dispatchChatInput,
        [FlowModuleTypeEnum.answerNode]: dispatchAnswer,
        [FlowModuleTypeEnum.chatNode]: dispatchChatCompletion,
        [FlowModuleTypeEnum.kbSearchNode]: dispatchKBSearch,
        [FlowModuleTypeEnum.classifyQuestion]: dispatchClassifyQuestion,
        [FlowModuleTypeEnum.contentExtract]: dispatchContentExtract,
        [FlowModuleTypeEnum.httpRequest]: dispatchHttpRequest
      };
      if (callbackMap[module.flowType]) {
        return callbackMap[module.flowType](props);
      }
      return {};
    })();

    return moduleOutput(module, dispatchRes);
  }

  // start process width initInput
  const initModules = runningModules.filter((item) => initModuleType[item.flowType]);

  await Promise.all(initModules.map((module) => moduleInput(module, params)));

  return {
    [TaskResponseKeyEnum.answerText]: chatAnswerText,
    [TaskResponseKeyEnum.responseData]: chatResponse
  };
}

function loadModules(
  modules: AppModuleItemType[],
  variables: Record<string, any>
): RunningModuleItemType[] {
  return modules.map((module) => {
    return {
      moduleId: module.moduleId,
      name: module.name,
      flowType: module.flowType,
      showStatus: module.showStatus,
      inputs: module.inputs
        .filter((item) => item.connected) // filter unconnected target input
        .map((item) => {
          if (typeof item.value !== 'string') {
            return {
              key: item.key,
              value: item.value
            };
          }

          // variables replace
          const replacedVal = item.value.replace(
            /{{(.*?)}}/g,
            (match, key) => variables[key.trim()] || match
          );

          return {
            key: item.key,
            value: replacedVal
          };
        }),
      outputs: module.outputs.map((item) => ({
        key: item.key,
        answer: item.key === TaskResponseKeyEnum.answerText,
        value: undefined,
        targets: item.targets
      }))
    };
  });
}

export function responseStatus({
  res,
  status,
  name
}: {
  res: NextApiResponse;
  status?: 'running' | 'finish';
  name?: string;
}) {
  if (!name) return;
  sseResponse({
    res,
    event: sseResponseEventEnum.moduleStatus,
    data: JSON.stringify({
      status: 'running',
      name
    })
  });
}

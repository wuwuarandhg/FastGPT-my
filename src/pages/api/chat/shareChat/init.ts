import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { connectToDatabase, OutLink, User } from '@/service/mongo';
import type { InitShareChatResponse } from '@/api/response/chat';
import { authApp } from '@/service/utils/auth';
import { HUMAN_ICON } from '@/constants/chat';
import { getChatModelNameList, getSpecialModule } from '@/components/ChatBox/utils';

/* 初始化我的聊天框，需要身份验证 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { shareId } = req.query as {
      shareId: string;
    };

    if (!shareId) {
      throw new Error('params is error');
    }

    await connectToDatabase();

    // get shareChat
    const shareChat = await OutLink.findOne({ shareId });

    if (!shareChat) {
      return jsonRes(res, {
        code: 501,
        error: '分享链接已失效'
      });
    }

    // 校验使用权限
    const [{ app }, user] = await Promise.all([
      authApp({
        appId: shareChat.appId,
        userId: String(shareChat.userId),
        authOwner: false
      }),
      User.findById(shareChat.userId, 'avatar')
    ]);

    jsonRes<InitShareChatResponse>(res, {
      data: {
        userAvatar: user?.avatar || HUMAN_ICON,
        app: {
          ...getSpecialModule(app.modules),
          chatModels: getChatModelNameList(app.modules),
          name: app.name,
          avatar: app.avatar,
          intro: app.intro
        }
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

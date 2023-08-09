import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { connectToDatabase, Chat } from '@/service/mongo';
import { authUser } from '@/service/utils/auth';
import { Types } from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let {
      chatId,
      contentId,
      quoteId,
      sourceText = ''
    } = req.body as {
      chatId: string;
      contentId: string;
      quoteId: string;
      sourceText: string;
    };
    await connectToDatabase();

    const { userId } = await authUser({ req, authToken: true });

    if (!contentId || !chatId || !quoteId) {
      throw new Error('params is error');
    }

    await Chat.updateOne(
      {
        chatId,
        userId: new Types.ObjectId(userId),
        'content._id': new Types.ObjectId(contentId)
      },
      {
        $set: {
          'content.$.rawSearch.$[quoteElem].source': sourceText
        }
      },
      {
        arrayFilters: [
          {
            'quoteElem.id': quoteId
          }
        ]
      }
    );

    jsonRes(res, {
      data: ''
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

import { reddit } from '@devvit/web/server';
import { DEFAULT_CHALLENGE_ID } from '../challenge';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Rangefinder — can you estimate reality?',
    postData: {
      challengeId: DEFAULT_CHALLENGE_ID,
      v: 1,
    },
  });
};

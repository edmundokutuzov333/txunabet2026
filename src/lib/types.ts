
export type FormState = {
  error?: string | null;
  message?: string | null;
};

export type Context = {
  type: 'campaign' | 'game_operation' | 'user' | 'meeting';
  id: string;
  name: string;
};

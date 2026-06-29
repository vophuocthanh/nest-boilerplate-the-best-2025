export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export interface ICreateUser {
  statusCode: number;
  token: string;
  tokenExpiration?: Date;
  user: any
}
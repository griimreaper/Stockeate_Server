export enum Cases {
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  RESET_PASSWORD = 'RESET_PASSWORD',
  PLAN_RENOVATION = 'PLAN_RENOVATION',
}

export interface SendMailDto {
  EmailAddress: string;
  subject: Cases;
  context: {
    name: string;
    tenantName?: string;
    [key: string]: any;
  };
}
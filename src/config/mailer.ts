import { EMAIL_USER, PASS_USER } from './enviroments';


export const transporter = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: PASS_USER,
  },
};

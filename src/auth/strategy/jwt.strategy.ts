import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWT_SECRET } from '../../config/enviroments';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  //With this return, now the request object provides a .user
  //property with the returned data below
  async validate(payload: any) {
    return {
      userId: payload.sub,
      userEmail: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}

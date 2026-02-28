import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AgentAuthGuard implements CanActivate {
    private readonly logger = new Logger(AgentAuthGuard.name);

    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Missing agent token');
        }

        try {
            const payload = this.jwtService.verify(token);

            if (payload.role !== 'agent') {
                throw new UnauthorizedException('Access restricted to agents');
            }

            // Attach identifiers to request for downstream handlers
            (request as any).userId = payload.userId;
            (request as any).agentId = payload.agentId;
            (request as any).role = payload.role;

            return true;
        } catch (err) {
            this.logger.error('Agent token verification failed', err?.message);
            throw new UnauthorizedException('Invalid or expired agent token');
        }
    }
}

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
export class AdminAuthGuard implements CanActivate {
    private readonly logger = new Logger(AdminAuthGuard.name);

    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Missing admin token');
        }

        try {
            const payload = this.jwtService.verify(token);

            if (payload.role !== 'admin') {
                throw new UnauthorizedException('Access restricted to admins');
            }

            // Attach identifiers to request for downstream handlers
            (request as any).userId = payload.userId;
            (request as any).adminId = payload.adminId;
            (request as any).role = payload.role;

            return true;
        } catch (err) {
            this.logger.error('Admin token verification failed', err?.message);
            throw new UnauthorizedException('Invalid or expired admin token');
        }
    }
}

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { s3Client, AWS_S3_BUCKET_NAME } from '../../utils/aws-s3.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { AgentService } from '../agent.service';
import { AgentKycUploadDto } from '../dto/agent-kyc-upload.dto';

@Controller('agent/kyc')
export class AgentKycController {
  constructor(private readonly agentService: AgentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadKyc(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AgentKycUploadDto,
  ) {
    // store in S3
    const key = `kyc/${randomUUID()}-${file.originalname}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
      }),
    );
    const url = `https://${AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // attach to agent
    const doc = { key, url, name: body.documentName };
    // body must include userId and agentId in a real flow; here we expect agentId
    const agentId = (body as any).agentId as string;
    await this.agentService.addKycDocument(agentId, doc);

    return { key, url };
  }
}

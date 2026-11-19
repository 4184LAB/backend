import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FileService {
  private readonly uploadDirectory = resolve(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async upload(postId: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일을 선택해주세요.');
    }

    await mkdir(this.uploadDirectory, { recursive: true });

    const storedName = `${randomUUID()}${extname(file.originalname)}`;
    const filePath = resolve(this.uploadDirectory, storedName);

    await writeFile(filePath, file.buffer);

    try {
      return await this.prisma.attachment.create({
        data: {
          postId,
          originalName: file.originalname,
          storedName,
          mimeType: file.mimetype,
          size: file.size,
        },
        select: {
          id: true,
          originalName: true,
          storedName: true,
          size: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  async findAttachment(filename: unknown) {
    if (
      typeof filename !== 'string' ||
      !filename.trim() ||
      filename.includes('\0')
    ) {
      throw new BadRequestException('filename을 입력해주세요.');
    }

    return this.prisma.attachment.findUnique({
      where: { storedName: filename },
      include: { post: { select: { type: true, deletedAt: true } } },
    });
  }

  async download(filename: string) {
    const attachment = await this.findAttachment(filename);

    if (attachment?.post.deletedAt) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    // 의도적인 경로추적 실습: filename이 uploads 밖으로 나가는지 검사하지 않는다.
    const filePath = resolve(this.uploadDirectory, filename);

    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('Not a file');
    } catch {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    return {
      path: filePath,
      name: attachment?.originalName ?? basename(filePath),
    };
  }
}

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

  /** 저장된 실제 파일을 지운다. 이미 없으면 무시한다. */
  private async deleteStoredFile(storedName: string) {
    const filePath = resolve(this.uploadDirectory, basename(storedName));

    await unlink(filePath).catch(() => undefined);
  }

  /** 게시글에 속한 첨부파일 한 건을 삭제한다. */
  async removeOneFromPost(postId: number, attachmentId: number) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, postId },
      select: { id: true, storedName: true },
    });

    if (!attachment) {
      throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    }

    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    await this.deleteStoredFile(attachment.storedName);

    return { message: '첨부파일이 삭제되었습니다.' };
  }

  /** 게시글의 첨부파일을 모두 삭제한다. 삭제된 건수를 돌려준다. */
  async removeAllFromPost(postId: number) {
    const attachments = await this.prisma.attachment.findMany({
      where: { postId },
      select: { storedName: true },
    });

    if (attachments.length === 0) {
      return 0;
    }

    await this.prisma.attachment.deleteMany({ where: { postId } });
    await Promise.all(
      attachments.map((attachment) =>
        this.deleteStoredFile(attachment.storedName),
      ),
    );

    return attachments.length;
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

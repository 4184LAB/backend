import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { OptionalJwtAuthGuard } from '../auth/jwt/jwt.guard';
import { searchSchema } from './schema/search.schema';
import type { SearchInput } from './schema/search.schema';
import { SearchService } from './search.service';

// GET /api/v1/search?q=&type=posts|comments|users&sort=latest|oldest&from=YYYY-MM-DD&to=YYYY-MM-DD
// 로그인은 선택: 비로그인은 공지만, 로그인하면 일반 게시글·댓글까지, 관리자는 회원까지 검색한다.
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  search(
    @Query(new ZodValidationPipe(searchSchema)) params: SearchInput,
    @User() viewer: RequestUser | null,
  ) {
    return this.searchService.search(params, viewer);
  }
}

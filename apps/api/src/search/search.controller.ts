import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { SearchService } from "./search.service";
import { SearchQueryDto } from "./dto/search-query.dto";

/** Full-text (`mode=fulltext`) or natural-language (`mode=semantic`) search over the user's snippets. */
@Controller("search")
@UseGuards(SupabaseAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  handleSearch(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchQueryDto) {
    return this.search.search(user.id, query.q, query.mode ?? "fulltext");
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { SnippetsService } from "./snippets.service";
import { CreateSnippetDto } from "./dto/create-snippet.dto";
import { UpdateSnippetDto } from "./dto/update-snippet.dto";

/** CRUD + sharing endpoints for snippets. */
@Controller("snippets")
export class SnippetsController {
  constructor(private readonly snippets: SnippetsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("workspaceId") workspaceId?: string) {
    return this.snippets.findAllForUser(user.id, workspaceId);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSnippetDto) {
    return this.snippets.create(user.id, dto);
  }

  // Public: anyone with the slug can view, no auth required.
  @Get("shared/:slug")
  findByShareSlug(@Param("slug") slug: string) {
    return this.snippets.findByShareSlug(slug);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.snippets.findOneOrThrow(id, user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSnippetDto,
  ) {
    return this.snippets.update(id, user.id, dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.snippets.remove(id, user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(":id/share")
  share(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.snippets.createShareLink(id, user.id);
  }
}

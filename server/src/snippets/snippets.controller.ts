import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SnippetsService } from './snippets.service';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { UpdateSnippetDto } from './dto/update-snippet.dto';

@Controller('snippets')
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  // ── Public endpoints (no auth required) ────────────────────────────────

  @Get('public')
  findPublic(
    @Query('search') search?: string,
    @Query('language') language?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.snippetsService.findPublic(
      search,
      language,
      tag,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.snippetsService.findOnePublic(id);
  }

  // ── Protected endpoints (JWT required) ─────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('language') language?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.snippetsService.findAll(
      req.user.id,
      search,
      language,
      tag,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.snippetsService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateSnippetDto, @Request() req) {
    return this.snippetsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSnippetDto, @Request() req) {
    return this.snippetsService.update(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.snippetsService.remove(id, req.user.id);
  }
}

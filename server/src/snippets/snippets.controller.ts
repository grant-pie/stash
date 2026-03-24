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
@UseGuards(JwtAuthGuard)
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('language') language?: string,
    @Query('tag') tag?: string,
  ) {
    return this.snippetsService.findAll(req.user.id, search, language, tag);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.snippetsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateSnippetDto, @Request() req) {
    return this.snippetsService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSnippetDto, @Request() req) {
    return this.snippetsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.snippetsService.remove(id, req.user.id);
  }
}

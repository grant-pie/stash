import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateSnippetDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  language: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

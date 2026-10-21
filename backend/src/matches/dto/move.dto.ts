import { IsString, IsOptional, Length } from 'class-validator';
export class MoveDto {
  @IsString() @Length(2,5) from!: string;
  @IsString() @Length(2,5) to!: string;
  @IsString() @IsOptional() promotion?: string;
}

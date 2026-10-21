import { IsString, IsInt, Min, IsDateString, IsEnum, IsOptional } from 'class-validator';
export class UpdateTournamentDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @Min(10) @IsOptional() timeControlInitial?: number;
  @IsInt() @Min(0) @IsOptional() timeControlIncrement?: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsEnum(['draft','open','ongoing','completed']) @IsOptional() status?: 'draft'|'open'|'ongoing'|'completed';
}

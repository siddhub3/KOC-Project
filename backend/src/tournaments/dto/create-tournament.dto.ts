import { IsString, IsInt, Min, IsDateString, IsEnum, IsOptional } from 'class-validator';
export class CreateTournamentDto {
  @IsString() name!: string;
  @IsInt() @Min(10) timeControlInitial!: number; // seconds
  @IsInt() @Min(0) timeControlIncrement!: number;
  @IsDateString() startDate!: string;
  @IsEnum(['draft','open','ongoing','completed']) @IsOptional() status?: 'draft'|'open'|'ongoing'|'completed';
}

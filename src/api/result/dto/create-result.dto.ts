import { Type } from "class-transformer";
import { IsArray, IsEmpty, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";
import { CreateDetailResultDto } from "src/api/detail-results/dto/create-detail-result.dto";

export class CreateResultDto {

    @IsNotEmpty()
    userId: string;

    @IsNotEmpty()
    topicId: string;

    @IsNotEmpty()
    totalQuestion: number;

    @IsNotEmpty()
    correctAnswer: number;

    @IsNotEmpty()
    timeSpent: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(()=> CreateDetailResultDto)
    detailResult: CreateDetailResultDto[];
}

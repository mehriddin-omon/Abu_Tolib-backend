import { IsBoolean, IsNotEmpty } from "class-validator";

export class CreateVariantDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsBoolean()
    isCorrect: boolean;
}

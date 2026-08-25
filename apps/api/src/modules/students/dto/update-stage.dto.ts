import { IsIn } from "class-validator";

export const STUDENT_STAGES = ["lead", "trial", "contract", "paid", "refusal"] as const;

export class UpdateStageDto {
  @IsIn(STUDENT_STAGES)
  stage!: string;
}

import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { ResultEntity } from "./result.entity";
import { BaseEntity } from "@my/common";

@Entity({ name: 'detailResult' })
export class DetailResultEntity extends BaseEntity {
    @Column({ type: 'uuid', name: 'questionId', nullable: false })
    questionId: string;

    @Column({ type: 'uuid', name: 'resultId', nullable: false })
    resultId: string;

    @Column({ type: 'uuid', name: 'SelectedVariantId', nullable: false })
    selectedVariantId: string;

    @Column({ type: 'boolean', name: "isCorrect", nullable: false })
    isCorrect: boolean;

   @ManyToOne(() => ResultEntity, (result) => result.detailResults)
    @JoinColumn({ name: 'resultId' })
    result: ResultEntity;
}

import { BaseEntity } from "@my/common";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, TopologyOpeningEvent } from "typeorm";
import { UserEntity } from "./user.entity";
import { DetailResultEntity } from "./detail-result.entity";
import { TopicEntity } from "./topic.entity";

@Entity({ name: 'results' })
export class ResultEntity extends BaseEntity {
    // @Column({ type: 'uuid', name: 'topicId', nullable: false })
    // topicId: string;

    // @Column({ type: 'uuid', name: 'userId', nullable: false })
    // userId: string;

    @Column({ type: 'int', name: 'totalQuestion', nullable: false })
    totalQuestion: number;

    @Column({ type: 'int', name: 'correctAnswer', nullable: false })
    correctAnswer: number;

    @Column({ type: 'varchar', name: 'timeSpent' })
    timeSpent: string;

    // Relationships
    @ManyToOne(() => UserEntity, (user) => user.results)
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @ManyToOne(() => TopicEntity, (topic) => topic.results)
    @JoinColumn({ name: 'topicId' })
    topic: TopicEntity;

    @OneToMany(() => DetailResultEntity, (detailResult) => detailResult.result)
    detailResults: DetailResultEntity[];
}

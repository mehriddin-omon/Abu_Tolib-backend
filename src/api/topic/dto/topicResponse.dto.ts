export class TopicResponseDto {
  id: string;
  title: string;
  subjectId: string;
  questions: 
  {
    id: string;
    text: string;
    type: string;
    level: string;
    time: string;
    imgUrl?: string | null;
    tags?: string[] | null;
    variants: [
      {
        id: string;
        name: string;
        isCorrect: boolean;
      }
    ];
  }[];


  constructor(partial: Partial<TopicResponseDto>) {
    Object.assign(this, partial);
  }
}
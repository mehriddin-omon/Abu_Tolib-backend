import { FindManyOptions } from 'typeorm';

export interface IResponse<T> {
  data: T | T[] | null;
  status: number;
  message: string | string[];
}

export interface IResponseWithPagination<T> {
  data: T[];
  meta: {
    totalElement: number; // barcha elemet soni
    totalPage: number; // jami sahifalar soni
    pageSize: number; // har bir sahifadagi element soni
    currentPage: number; // hozirgi ko'rilayotgan sahifa
    from: number; // from = (current_page - 1) * page_size + 1 = (2 - 1) * 10 + 1 = 11
    to: number; // to = current_page * page_size = 2 * 10 = 20
  };
  statusCode: number;
  message: string | string[];
}

export interface IFindOptions<T> extends FindManyOptions<T> {}

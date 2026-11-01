import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler = (route: AsyncRoute): RequestHandler => {
  return (req, res, next) => {
    route(req, res, next).catch(next);
  };
};

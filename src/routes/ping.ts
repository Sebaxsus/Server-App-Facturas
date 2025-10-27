import { Router, type Request, type Response, type NextFunction } from "express"

export const pingRouter = Router()

pingRouter.get("/ping", (req: Request, res: Response, next: NextFunction) => {
    res.json({ message: "Pong" })
})

export default pingRouter
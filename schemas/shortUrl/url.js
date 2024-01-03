const z = require("zod")

const urlSchema = z.object({
  url: z.string().url(),
})

const validateUrl = (url) => urlSchema.safeParse(url)

module.exports = validateUrl
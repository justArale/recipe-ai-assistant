import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { createFiberplane } from "@fiberplane/hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import * as schema from "./db/schema";

// Types for environment variables and context
type Bindings = {
  DB: D1Database; // Cloudflare D1 database binding
};

type Variables = {
  db: DrizzleD1Database;
};

// Create the app with type-safe bindings and variables
// For more information on OpenAPIHono, see: https://hono.dev/examples/zod-openapi
const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware: Set up D1 database connection for all routes
app.use(async (c, next) => {
  const db = drizzle(c.env.DB);
  c.set("db", db);
  await next();
});

// Route Definitions
// Each route is defined separately with its request/response schema
// This enables automatic OpenAPI documentation and type safety

const root = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: { "text/plain": { schema: z.string() } },
      description: "Root fetched successfully",
    },
  },
});

// Define the expected response shape using Zod
//
// We can add openapi documentation, as well as name the Schema in the OpenAPI document,
// by chaining `openapi` on the zod schema definitions
const RecipeSchema = z
  .object({
    id: z.number().openapi({
      example: 1,
    }),
    name: z.string().openapi({
      example: "Ramen",
    }),
    ingredience: z.string().email().openapi({
      example: "Soba, brouth, pork, eggs",
    }),
  })
  .openapi("User");

const getRecipes = createRoute({
  method: "get",
  path: "/api/recipes",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(RecipeSchema) } },
      description: "Recipes fetched successfully",
    },
  },
});

const getRecipe = createRoute({
  method: "get",
  path: "/api/recipes/{id}",
  request: {
    // Validate and parse URL parameters
    params: z.object({
      id: z.coerce.number().openapi({
        example: 1,
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: RecipeSchema } },
      description: "Recipe fetched successfully",
    },
  },
});

const NewRecipeSchema = z
  .object({
    name: z.string().openapi({
      example: "Ramen",
    }),
    ingredience: z.string().email().openapi({
      example: "Soba, brouth, pork, eggs",
    }),
  })
  .openapi("NewRecipe");

const createRecipe = createRoute({
  method: "post",
  path: "/api/recipe",
  request: {
    // Validate request body using Zod schemas
    body: {
      required: true, // NOTE: this is important to set to true, otherwise the route will accept empty body
      content: {
        "application/json": {
          schema: NewRecipeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: RecipeSchema,
        },
      },
      description: "Recipe created successfully",
    },
  },
});

// Route Implementations
// Connect the route definitions to their handlers using .openapi()
app
  .openapi(root, (c) => {
    return c.text("Honc from above! ☁️🪿");
  })
  .openapi(getRecipes, async (c) => {
    const db = c.get("db");
    const users = await db.select().from(schema.recipes);
    return c.json(users);
  })
  .openapi(getRecipe, async (c) => {
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const [user] = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.id, id));
    return c.json(user);
  })
  .openapi(createRecipe, async (c) => {
    const db = c.get("db");
    const { name, ingredience } = c.req.valid("json");

    const [newRecipe] = await db
      .insert(schema.recipes)
      .values({
        name,
        ingredience,
      })
      .returning();

    return c.json(newRecipe, 201);
  })
  // Generate OpenAPI spec at /openapi.json
  .doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "D1 Honc! 🪿☁️",
      version: "1.0.0",
      description: "D1 Honc! 🪿☁️",
    },
  })
  .use(
    "/fp/*",
    createFiberplane({
      openapi: { url: "/openapi.json" },
    })
  );

export default app;

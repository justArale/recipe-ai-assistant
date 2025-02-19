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
    ingredience: z.string().openapi({
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

app.get("/", async (c) => {
  const db = c.get("db");
  const recipes = await db.select().from(schema.recipes);

  const recipeList = recipes
    .map(
      (recipe) => `
      <li>
        <strong>${recipe.name}</strong>: ${recipe.ingredience}
      </li>`
    )
    .join("");

  return c.html(`
    <html>
      <head>
        <title>Recipe List</title>
        <style>
          body {
            background-color: #f8f9fa;
            font-family: 'Arial', sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100vh;
            position: relative;
            margin-left: 20px; /* Add this line */
            margin-right: 20px; /* Add this line */
          }
          h1 {
            color: #007bff;
          }
          .container {
            display: flex;
            justify-content: space-between;
            width: 80%;
          }
          .recipe-list, .recipe-form {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 45%;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          li {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input[type="text"] {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          button {
            background-color: #007bff;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #0056b3;
          }
          .header {
            display: flex;
            align-items: center;
            background-color: white; /* Changed to white */
            padding: 10px;
            color: black; /* Changed to black */
            width: 100%;
          }
          .header img {
            height: 50px;
            margin-right: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: black; /* Changed to black */
          }
          .main {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-grow: 1;
            width: 100%;
          }
          .ask-gpt4o-button {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background-color: #007bff; /* Changed to blue */
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            position: relative;
          }
          .ask-gpt4o-button:hover {
            background-color: #0056b3; /* Changed to darker blue */
          }
          .ask-gpt4o-button:hover::after {
            content: "Comming soon...";
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: #fff;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://thumbs.dreamstime.com/b/red-food-truck-side-d-render-series-40635482.jpg" alt="Logo">
          <h1>le recipe ai assistant</h1>
          <button class="ask-gpt4o-button">Ask GPT4o</button> <!-- Moved button here -->
        </div>
        <div class="main">
          <div class="container">
            <div class="recipe-list">
              <h1>Recipes</h1>
              <ul>${recipeList}</ul>
            </div>
            <div class="recipe-form">
              <h2>Add a new recipe</h2>
              <form action="/add-recipe" method="post">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required>
                <br>
                <label for="ingredience">Ingredients:</label>
                <input type="text" id="ingredience" name="ingredience" required>
                <br>
                <button type="submit">Add Recipe</button>
              </form>
            </div>
          </div>
        </div>
      </body>
    </html>`);
});

app.post("/add-recipe", async (c) => {
  const db = c.get("db");
  const { name, ingredience } = await c.req.parseBody();

  await db.insert(schema.recipes).values({
    name,
    ingredience,
  });

  return c.redirect("/");
});

app.get("/recipes", async (c) => {
  const db = c.get("db");
  const recipes = await db.select().from(schema.recipes);
  const recipeList = recipes
    .map(
      (recipe) => `
      <li>
        <strong>${recipe.name}</strong>: ${recipe.ingredience}
      </li>`
    )
    .join("");
  return c.html(`
    <html>
      <head>
        <title>Recipe List</title>
        <style>
          body {
            background-color: #f8f9fa;
            font-family: 'Arial', sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          h1 {
            color: #007bff;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          li {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
          }
          .header {
            display: flex;
            align-items: center;
            background-color: white; /* Changed to white */
            padding: 10px;
            color: black; /* Changed to black */
            width: 100%;
          }
          .header img {
            height: 50px;
            margin-right: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: black; /* Changed to black */
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="IMG_6828 2.png" alt="Logo">
          <h1>le recipe ai assistant</h1>
        </div>
        <div>
          <h1>Recipes</h1>
          <ul>${recipeList}</ul>
        </div>
      </body>
    </html>`);
});

// Route Implementations
// Connect the route definitions to their handlers using .openapi()
app
  // .openapi(root, (c) => {
  //   return c.text("Honc from above! ☁️🪿");
  // })
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

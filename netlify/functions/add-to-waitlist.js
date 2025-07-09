const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();

function rateLimit(ip, windowMs = 60000, maxRequests = 5) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const requests = rateLimitStore.get(ip);
  const recentRequests = requests.filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentRequests.length >= maxRequests) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);

  return true;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    // Rate limiting
    const clientIP =
      event.headers["x-forwarded-for"] ||
      event.headers["x-real-ip"] ||
      "127.0.0.1";
    if (!rateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          message: "Too many requests. Please try again later.",
        }),
      };
    }

    // Parse request body
    const { email, wantsUpdates } = JSON.parse(event.body);

    // Validate input
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Email is required" }),
      };
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (!validateEmail(sanitizedEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid email format" }),
      };
    }

    // Add to database
    const { data, error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: sanitizedEmail,
          wants_updates: Boolean(wantsUpdates),
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Database error:", error);

      // Check for duplicate email
      if (error.code === "23505") {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            message: "Email already exists on the waitlist",
          }),
        };
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Internal server error" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Successfully added to waitlist",
        id: data[0].id,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

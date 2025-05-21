// netlify/functions/getConfig.js
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    })
  };
};
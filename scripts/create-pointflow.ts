import { createClient } from "@supabase/supabase-js"
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createPointFlowProject() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  
  if (userError || !users.users.length) {
    console.error("No users found or error fetching users:", userError)
    return
  }

  // Assuming the first user is the admin/owner for this demo
  const userId = users.users[0].id

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: "PointFlow",
      url: "https://pointflow.m4bank.ru/",
      user_id: userId
    })
    .select()

  if (error) {
    console.error("Error creating project:", error)
  } else {
    console.log("Project PointFlow created successfully:", data)
  }
}

createPointFlowProject()

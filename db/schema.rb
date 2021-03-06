# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20190925163944) do

  create_table "comments", force: :cascade do |t|
    t.integer "repository_id", null: false
    t.string "file", null: false
    t.string "sha", null: false
    t.string "range"
    t.string "description"
    t.integer "ctype"
    t.integer "parent_id"
    t.boolean "visible", default: true
  end

  create_table "repositories", force: :cascade do |t|
    t.string "address"
    t.string "filter"
    t.string "name"
  end

  create_table "roles", force: :cascade do |t|
    t.string "title"
  end

  create_table "user_repositories", force: :cascade do |t|
    t.integer "user_id"
    t.integer "repository_id"
    t.index ["repository_id"], name: "index_user_repositories_on_repository_id"
    t.index ["user_id"], name: "index_user_repositories_on_user_id"
  end

  create_table "user_roles", force: :cascade do |t|
    t.integer "user_id"
    t.integer "role_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["role_id"], name: "index_user_roles_on_role_id"
    t.index ["user_id"], name: "index_user_roles_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "login", default: "", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

end

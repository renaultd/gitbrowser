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

ActiveRecord::Schema.define(version: 20190830153515) do

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

end

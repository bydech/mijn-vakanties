/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("expenses_col")

  // remove field
  collection.fields.removeById("text3632233996")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("expenses_col")

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3632233996",
    "max": 0,
    "min": 0,
    "name": "test",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})

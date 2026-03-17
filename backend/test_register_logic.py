import asyncio
from app.database import connect_db, programs_collection, students_collection
from bson import ObjectId

async def main():
    await connect_db()
    program_id = '699c22b9d0f15404f02d92a6'
    print(f'Looking for {program_id}')
    
    # Simulate auth_routes.py behavior
    try:
        obj_id = ObjectId(program_id)
        print(f"Parsed ObjectId: {obj_id}")
    except Exception as e:
        print(f"Failed to parse ObjectId: {e}")
        return

    program = await programs_collection.find_one({"_id": obj_id})
    if not program:
        print("Invalid program selected: Not found in DB")
        return
        
    print(f"Program found! {program['name']}")

if __name__ == "__main__":
    asyncio.run(main())

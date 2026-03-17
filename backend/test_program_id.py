import asyncio
from app.database import connect_db, programs_collection
from bson import ObjectId

async def main():
    await connect_db()
    program_id = '699c22b9d0f15404f02d92a6'
    print(f'Looking for {program_id}')
    doc = await programs_collection.find_one({'_id': ObjectId(program_id)})
    print(f'Found doc with ObjectId: {doc}')
    
    print('All program IDs:')
    async for p in programs_collection.find({}):
        print(f'ID: {p["_id"]}, Type: {type(p["_id"])}')

if __name__ == "__main__":
    asyncio.run(main())

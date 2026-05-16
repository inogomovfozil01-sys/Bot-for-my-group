import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.client.default import DefaultBotProperties
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")

ADMINS = [6564196947]

users = set()

bot = Bot(
    token=TOKEN,
    default=DefaultBotProperties(
        parse_mode=ParseMode.HTML
    )
)

dp = Dispatcher()


@dp.message()
async def save_users(message: Message):
    users.add(message.chat.id)


@dp.message(Command("start"))
async def start_cmd(message: Message):
    users.add(message.chat.id)


@dp.message(Command("active"))
async def active_cmd(message: Message):

    if message.from_user.id not in ADMINS:
        return

    if not message.reply_to_message:
        return

    for user_id in users:
        try:
            await bot.copy_message(
                chat_id=user_id,
                from_chat_id=message.chat.id,
                message_id=message.reply_to_message.message_id
            )

            await asyncio.sleep(0.05)

        except:
            pass


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

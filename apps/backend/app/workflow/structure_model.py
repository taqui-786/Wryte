

from pydantic import BaseModel, Field

from app.workflow.llm import llm


class ChatModel(BaseModel):
    response: str = Field(
        description="The assistant message shown to the user."
    )

    need_plan: bool = Field(
        description=(
            "True when the user's request should first go through a planning "
            "phase before execution. False when it can be answered directly."
        )
    )
llm_chat_model = llm.with_structured_output(ChatModel) 
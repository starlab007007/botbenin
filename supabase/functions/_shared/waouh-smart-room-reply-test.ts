import { assertEquals } from "jsr:@std/assert@1";
import { classifyRoomReply, roomReplyAmount } from "./waouh-smart-room-reply.ts";
Deno.test("explicit stop, refusal, and price never accept a contract",async()=>{
 assertEquals(await classifyRoomReply("STOP"),"stop");
 assertEquals(await classifyRoomReply("Non, pas disponible"),"negative");
 assertEquals(await classifyRoomReply("Je propose 25 000 FCFA"),"price");
 assertEquals(await classifyRoomReply("Oui disponible"),"positive");
});

Deno.test("price guidance only uses unambiguous deterministic amounts",()=>{
 assertEquals(roomReplyAmount("Je propose 25 000 FCFA"),25000);
 assertEquals(roomReplyAmount("25000 FCFA ou 30000 FCFA"),null);
 assertEquals(roomReplyAmount("Oui disponible"),null);
});

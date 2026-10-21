// In-memory Map tournamentId -> queue: userId[]
// At most one active match per player checked via activeMatches Map userId -> matchId
// FIFO pairing: when queue length >=2, pop 2, randomize colors, create match with timeControl parsed to ms (e.g. 5+0 => 5*60*1000)
// Emit match:paired to both sockets via server.to(userSocketId).emit
// Clock handling: on move, deduct Date.now() - lastMoveAt from mover's clock, increment if timeControl has increment, check timeout interval 1s, if zero -> result loss on time
// chess.js server validation: new Chess(fen).move({from,to,promotion}) -> if invalid emit error, else broadcast move, switch turn, update PGN/FEN, check game_over: checkmate, stalemate, draw

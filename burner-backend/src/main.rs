mod logic;
mod utils;

use actix_web::{App, HttpResponse, HttpServer, get, web::Path};
use serde::Serialize;
use tokio::task::spawn_blocking;

#[derive(Serialize)]
struct BurnResponse {
    answer: u64,
}

#[get("/burn/{difficulty}")]
async fn burn(path: Path<u64>) -> HttpResponse {
    let difficulty = path.into_inner();

    // This is blocking, and would block Tokio
    let answer = spawn_blocking(move || logic::fib(difficulty))
        .await
        .unwrap();

    HttpResponse::Ok().json(BurnResponse { answer })
}

#[get("/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().body("OK")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let host = get_env!("HOST", String);
    let port = get_env!("PORT", u16);

    println!("Server running at http://{}:{}", host, port);

    HttpServer::new(|| App::new().service(burn).service(health))
        .bind((host, port))?
        .run()
        .await
}

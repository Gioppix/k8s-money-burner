mod logic;
mod utils;

use actix_web::{
    App, HttpResponse, HttpServer, get,
    web::{Data, Path},
};
use serde::Serialize;
use tokio::task::spawn_blocking;
use uuid::Uuid;

#[derive(Serialize)]
struct BurnResponse {
    answer: u64,
    worker_id: Uuid,
}

#[get("/burn/{difficulty}")]
async fn burn(path: Path<u64>, worker_id: Data<Uuid>) -> HttpResponse {
    let difficulty = path.into_inner();

    // This is blocking, and would block Tokio
    let answer = spawn_blocking(move || logic::fib(difficulty))
        .await
        .unwrap();

    HttpResponse::Ok().json(BurnResponse {
        answer,
        worker_id: **worker_id,
    })
}

#[get("/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().body("OK")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let host = get_env!("HOST", String);
    let port = get_env!("PORT", u16);
    let worker_id = Uuid::new_v4();

    println!("Server running at http://{}:{}", host, port);

    let data = Data::new(worker_id);

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .service(burn)
            .service(health)
    })
    .bind((host, port))?
    .run()
    .await
}

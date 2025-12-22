mod utils;

use actix_web::{App, HttpResponse, HttpServer, get, post};

#[post("/burn")]
async fn burn() -> HttpResponse {
    HttpResponse::Ok().body("Burn endpoint")
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

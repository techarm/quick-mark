use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::commands::browser::fetch_url_info_impl;
use crate::commands::links::{check_duplicate_url_impl, create_link_impl, CreateLinkInput};
use crate::db::AppDb;

const PORT_START: u16 = 21579;
const PORT_END: u16 = 21589;

#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Deserialize)]
struct CheckDuplicateRequest {
    url: String,
}

#[derive(Deserialize)]
struct FetchInfoRequest {
    url: String,
}

fn success_response<T: Serialize>(data: T) -> String {
    serde_json::to_string(&ApiResponse {
        success: true,
        data: Some(data),
        error: None::<String>,
    })
    .unwrap_or_else(|_| r#"{"success":false,"error":"Serialization error"}"#.to_string())
}

fn error_response(msg: &str) -> String {
    serde_json::to_string(&ApiResponse::<()> {
        success: false,
        data: None,
        error: Some(msg.to_string()),
    })
    .unwrap_or_else(|_| format!(r#"{{"success":false,"error":"{}"}}"#, msg))
}

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
        Header::from_bytes("Access-Control-Allow-Methods", "GET, POST, OPTIONS").unwrap(),
        Header::from_bytes("Access-Control-Allow-Headers", "Content-Type, Authorization").unwrap(),
        Header::from_bytes("Access-Control-Max-Age", "86400").unwrap(),
        Header::from_bytes("Content-Type", "application/json; charset=utf-8").unwrap(),
    ]
}

fn json_response(status: u16, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let data = body.into_bytes();
    let len = data.len();
    Response::new(
        StatusCode(status),
        cors_headers(),
        std::io::Cursor::new(data),
        Some(len),
        None,
    )
}

fn read_json_body<T: serde::de::DeserializeOwned>(request: &mut Request) -> Result<T, String> {
    let mut body = String::new();
    std::io::Read::read_to_string(request.as_reader(), &mut body)
        .map_err(|e| format!("Failed to read request body: {}", e))?;
    serde_json::from_str(&body).map_err(|e| format!("Invalid JSON: {}", e))
}

fn check_auth(request: &Request, token: &str) -> bool {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Authorization"))
        .and_then(|h| h.value.as_str().strip_prefix("Bearer "))
        .map(|t| t == token)
        .unwrap_or(false)
}

pub fn start_server(db: Arc<Mutex<AppDb>>, token: String, app_data_dir: PathBuf) {
    let server = try_bind_server();
    let server = match server {
        Some(s) => s,
        None => {
            eprintln!("[QuickMark API] Failed to bind to any port in range {}-{}", PORT_START, PORT_END);
            return;
        }
    };

    let port = server.server_addr().to_ip().map(|a| a.port()).unwrap_or(0);
    eprintln!("[QuickMark API] Server started on port {}", port);

    // Write active port to file
    let port_file = app_data_dir.join("api_port");
    let _ = std::fs::write(&port_file, port.to_string());

    for mut request in server.incoming_requests() {
        let path = request.url().split('?').next().unwrap_or("").to_string();
        let method = request.method().clone();

        let response = match (method, path.as_str()) {
            // CORS preflight
            (Method::Options, _) if path.starts_with("/api/") => {
                json_response(204, String::new())
            }

            // Health check (no auth)
            (Method::Get, "/api/ping") => {
                json_response(200, success_response(serde_json::json!({
                    "status": "ok",
                    "app": "QuickMark"
                })))
            }

            // Authenticated endpoints
            (Method::Post, "/api/links") => {
                if !check_auth(&request, &token) {
                    json_response(401, error_response("Unauthorized"))
                } else {
                    handle_create_link(&mut request, &db)
                }
            }

            (Method::Post, "/api/check-duplicate") => {
                if !check_auth(&request, &token) {
                    json_response(401, error_response("Unauthorized"))
                } else {
                    handle_check_duplicate(&mut request, &db)
                }
            }

            (Method::Post, "/api/fetch-info") => {
                if !check_auth(&request, &token) {
                    json_response(401, error_response("Unauthorized"))
                } else {
                    handle_fetch_info(&mut request)
                }
            }

            _ => json_response(404, error_response("Not found")),
        };

        let _ = request.respond(response);
    }
}

fn try_bind_server() -> Option<Server> {
    for port in PORT_START..=PORT_END {
        let addr = format!("127.0.0.1:{}", port);
        if let Ok(server) = Server::http(&addr) {
            return Some(server);
        }
    }
    None
}

fn handle_create_link(
    request: &mut Request,
    db: &Arc<Mutex<AppDb>>,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let input: CreateLinkInput = match read_json_body(request) {
        Ok(v) => v,
        Err(e) => return json_response(400, error_response(&e)),
    };

    let db = match db.lock() {
        Ok(db) => db,
        Err(e) => return json_response(500, error_response(&format!("DB lock failed: {}", e))),
    };

    match create_link_impl(&db.conn, input) {
        Ok(link) => json_response(200, success_response(link)),
        Err(e) => json_response(400, error_response(&e)),
    }
}

fn handle_check_duplicate(
    request: &mut Request,
    db: &Arc<Mutex<AppDb>>,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let body: CheckDuplicateRequest = match read_json_body(request) {
        Ok(v) => v,
        Err(e) => return json_response(400, error_response(&e)),
    };

    let db = match db.lock() {
        Ok(db) => db,
        Err(e) => return json_response(500, error_response(&format!("DB lock failed: {}", e))),
    };

    match check_duplicate_url_impl(&db.conn, &body.url) {
        Ok(result) => json_response(200, success_response(result)),
        Err(e) => json_response(500, error_response(&e)),
    }
}

fn handle_fetch_info(
    request: &mut Request,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let body: FetchInfoRequest = match read_json_body(request) {
        Ok(v) => v,
        Err(e) => return json_response(400, error_response(&e)),
    };

    match fetch_url_info_impl(body.url) {
        Ok(info) => json_response(200, success_response(info)),
        Err(e) => json_response(500, error_response(&e)),
    }
}

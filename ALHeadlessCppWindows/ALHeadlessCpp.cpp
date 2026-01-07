#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <wrl.h>
#include <wil/com.h>
#include <WebView2.h>
#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <filesystem>
#include <thread>
#include <objbase.h>
#include "nlohmann/json.hpp"

using namespace Microsoft::WRL;
using json = nlohmann::json;
namespace fs = std::filesystem;

// Global Config
const std::vector<std::string> CHARACTERS = { "Jhlwarrior", "Jhlpriest", "Jhlmage", "Jhlmerch" };
const std::string REGION = "EU/II/";
std::string G_EMAIL = "";
std::string G_PASS = "";

std::wstring s2ws(const std::string& str) {
	if (str.empty()) return std::wstring();
	int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
	std::wstring wstrTo(size_needed, 0);
	MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
	return wstrTo;
}

class BotInstance {
public:
	std::string name;
	HWND hWnd;
	wil::com_ptr<ICoreWebView2Controller> controller;
	wil::com_ptr<ICoreWebView2> webview;
	int state = 0;

	BotInstance(std::string charName) : name(charName), hWnd(nullptr) {}

	void Initialize(HINSTANCE hInstance);
	void Restart();

	// Helper to execute script and get result easily
	void QueryJS(std::wstring script, std::function<void(std::wstring)> callback) {
		if (!webview) return;
		webview->ExecuteScript(script.c_str(), Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
			[callback](HRESULT hr, LPCWSTR result) -> HRESULT {
				callback(result ? result : L"");
				return S_OK;
			}).Get());
	}
};

std::vector<BotInstance*> bots;

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
	if (message == WM_DESTROY) {
		PostQuitMessage(0);
		return 0;
	}
	return DefWindowProc(hWnd, message, wParam, lParam);
}

// --- Inside BotInstance::Initialize ---
void BotInstance::Initialize(HINSTANCE hInstance) {
	if (!hWnd) {
		// Register and Create Window (standard stuff)
		WNDCLASSEXW wcex = { sizeof(WNDCLASSEX), CS_HREDRAW | CS_VREDRAW, WndProc, 0, 0, hInstance, NULL, NULL, NULL, NULL, L"ALBotWindow", NULL };
		RegisterClassExW(&wcex);
		hWnd = CreateWindowW(L"ALBotWindow", s2ws(name).c_str(), WS_OVERLAPPEDWINDOW, 0, 0, 1280, 720, nullptr, nullptr, hInstance, nullptr);
	}


	ShowWindow(hWnd, SW_SHOW);
	UpdateWindow(hWnd);

	std::string appData = getenv("LOCALAPPDATA");
	std::wstring userDataFolder = s2ws(appData + "\\ALBots\\" + name);

	CreateCoreWebView2EnvironmentWithOptions(nullptr, userDataFolder.c_str(), nullptr,
		Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
			[this](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
				env->CreateCoreWebView2Controller(this->hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
					[this](HRESULT result, ICoreWebView2Controller* c) -> HRESULT {
						if (FAILED(result)) return result;

						// 1. Assign the controller first
						controller = c;

						// 2. GET the webview pointer immediately
						controller->get_CoreWebView2(&webview);

						// 3. NOW you can safely use 'webview' to add event listeners
						webview->add_ProcessFailed(Callback<ICoreWebView2ProcessFailedEventHandler>(
							[this](ICoreWebView2* sender, ICoreWebView2ProcessFailedEventArgs* args) -> HRESULT {
								COREWEBVIEW2_PROCESS_FAILED_KIND kind;
								args->get_ProcessFailedKind(&kind);
								std::cerr << "[" << name << "] ⚠️ Browser Process Crashed! Kind: " << kind << std::endl;
								this->Restart();
								return S_OK;
							}).Get(), nullptr);

						// 4. Set bounds and visibility
						RECT bounds;
						GetClientRect(hWnd, &bounds);
						controller->put_Bounds(bounds);
						controller->put_IsVisible(TRUE);

						// 5. Add Navigation Completed listener
						webview->add_NavigationCompleted(Callback<ICoreWebView2NavigationCompletedEventHandler>(
							[this](ICoreWebView2* sender, ICoreWebView2NavigationCompletedEventArgs* args) -> HRESULT {
								if (this->state == 0) {
									std::cout << "[" << name << "] Page Loaded. Starting Login Flow..." << std::endl;
									this->state = 1;
								}
								return S_OK;
							}).Get(), nullptr);

						webview->AddScriptToExecuteOnDocumentCreated(L"document.head.insertAdjacentHTML('beforeend', '<style>* { animation: none !important; transition: none !important; } body { background: #000 !important; } #game, #bottommode, .utop { visibility: hidden !important; }</style>');", nullptr);

						std::cout << "[" << name << "] Initializing engine and navigating..." << std::endl;
						webview->Navigate(L"https://adventure.land/");

						// Hide the window after 2 seconds to be safe
						std::thread([this]() {
							std::this_thread::sleep_for(std::chrono::milliseconds(2000));
							ShowWindow(this->hWnd, SW_HIDE); // TODO: uncomment
							}).detach();

						return S_OK;
					}).Get());
				return S_OK;
			}).Get());
}

void BotInstance::Restart() {
	std::cout << "[" << name << "] Restarting in 12s..." << std::endl;
	if (controller) controller->Close();
	webview = nullptr;
	controller = nullptr;
	state = -1; // Cooling down

	std::thread([this]() {
		std::this_thread::sleep_for(std::chrono::seconds(12));
		this->state = 0;
		this->Initialize(GetModuleHandle(NULL));
		}).detach();
}

int main() {
	CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
	std::ifstream f("config.json");
	json config = json::parse(f);
	G_EMAIL = config["email"];
	G_PASS = config["password"];

	HINSTANCE hInst = GetModuleHandle(NULL);
	for (const auto& charName : CHARACTERS) {
		BotInstance* bot = new BotInstance(charName);
		bot->Initialize(hInst);
		bots.push_back(bot);
		std::this_thread::sleep_for(std::chrono::milliseconds(1500));
	}

	MSG msg;
	while (true) {
		while (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE)) {
			TranslateMessage(&msg); DispatchMessage(&msg);
			if (msg.message == WM_QUIT) return 0;
		}

		static auto lastCheck = std::chrono::steady_clock::now();
		if (std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - lastCheck).count() > 2000) {
			lastCheck = std::chrono::steady_clock::now();

			for (auto* bot : bots) {
				if (!bot->webview) continue;

				// --- FLOW: LOGIN ---
				// --- STATE 1: SMART DETECTION ---
				if (bot->state == 1) {
					std::string detectJs = "(() => {"
						"  if (document.querySelector('#email2')) return 'NEED_LOGIN';"
						"  if (document.querySelector('#toprightcorner') || document.querySelector('.characters')) return 'ALREADY_LOGGED_IN';"
						"  return 'WAITING';"
						"})()";

					bot->QueryJS(s2ws(detectJs), [bot](std::wstring res) {
						if (res.find(L"NEED_LOGIN") != std::wstring::npos) {
							// Standard login flow
							std::string loginJs = "(() => {"
								"  const btn = document.querySelector('#loginbuttons > div.whiteheader.mb4.clickable');"
								"  const emailInput = document.querySelector('#email2');"
								"  if(emailInput && emailInput.offsetParent !== null) {"
								"    emailInput.value = '" + G_EMAIL + "'; document.querySelector('#password2').value = '" + G_PASS + "';"
								"    document.querySelector('#loginlogin > div.textbutton.mt5.lbutton').click();"
								"    return 'DONE';"
								"  } else if(btn) { btn.click(); return 'OPENED'; }"
								"  return 'WAITING'; })();";

							bot->QueryJS(s2ws(loginJs), [bot](std::wstring resLogin) {
								if (resLogin.find(L"DONE") != std::wstring::npos) {
									std::cout << "[" << bot->name << "] Login details sent." << std::endl;
									bot->state = 2; // Move to wait for login to finish
								}
								});
						}
						else if (res.find(L"ALREADY_LOGGED_IN") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Session detected. Bypassing login..." << std::endl;
							bot->state = 2; // Skip straight to navigation
						}
						});
				}

				// --- STATE 2: NAVIGATION ---
				if (bot->state == 2) {
					bot->QueryJS(L"document.querySelector('#email2') ? 'STILL_THERE' : 'GONE'", [bot](std::wstring res) {
						if (res.find(L"GONE") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Navigating to character..." << std::endl;
							std::wstring url = s2ws("https://adventure.land/character/" + bot->name + "/in/" + REGION);
							bot->webview->Navigate(url.c_str());
							bot->state = 25;
						}
						});
				}

				// --- NEW FLOW: WAIT FOR CHARACTER PAGE LOAD ---
				if (bot->state == 25) {
					// We check if the game UI (specifically the 'toprightcorner') exists to confirm navigation finished
					bot->QueryJS(L"document.querySelector('#toprightcorner') ? 'LOADED' : 'WAITING'", [bot](std::wstring res) {
						if (res.find(L"LOADED") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Character page loaded. Ready to engage." << std::endl;
							bot->state = 3;
						}
						});
				}

				// --- FLOW: ENGAGE CODE ---
				if (bot->state == 3) {
					std::string engageJs = "(() => {"
						"if(document.querySelector('#iframelist > div')) return 'RUNNING';"
						"const engage = document.querySelector('.iengagebutton');"
						"if(engage && engage.clientHeight > 0) { engage.click(); return 'CLICKED'; }"
						"const charBtn = document.querySelector('.character-button');" // If on char select screen
						"if(charBtn) { charBtn.click(); return 'CHAR_SELECT_CLICK'; }"
						"return 'WAITING'; })();";

					bot->QueryJS(s2ws(engageJs), [bot](std::wstring res) {
						if (res.find(L"RUNNING") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Code detected as running." << std::endl;
							bot->state = 4;
						}
						});
				}

				// --- STATE 4: OPTIMIZE PIXI ---
				if (bot->state == 4) {
					std::wstring optJs = L"(() => {"
						"const f = document.querySelector('iframe');"
						"if(!f || !f.contentWindow.PIXI) return 'WAITING';"
						"const pixi = f.contentWindow.PIXI;"
						"if(pixi.ticker.shared) pixi.ticker.shared.stop();"
						"if(pixi.ticker.system) pixi.ticker.system.stop();"
						"const canvas = f.contentDocument.querySelector('canvas');"
						"if(canvas) canvas.style.display = 'none';"
						"return 'OPTIMIZED'; })();";

					bot->QueryJS(optJs, [bot](std::wstring res) {
						if (res.find(L"OPTIMIZED") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Optimization applied. Monitoring..." << std::endl;
							bot->state = 100; // Final Running State
						}
						});
				}

				// --- FLOW: WATCHDOG ---
				if (bot->state == 100) {
					// 1. Check for Disconnect Text
					// 2. Check if Code stopped (Engage button visible again)
					std::wstring watchdogJs = L"(() => {"
						"  if(document.body.innerText.includes('Disconnected')) return 'RESTART';"
						"  const engageBtn = document.querySelector('.iengagebutton');"
						"  if(engageBtn && engageBtn.offsetParent !== null) return 'RESTART';" // Code stopped!
						"  return 'OK';"
						"})()";

					bot->QueryJS(watchdogJs, [bot](std::wstring res) {
						if (res.find(L"RESTART") != std::wstring::npos) {
							std::cout << "[" << bot->name << "] Watchdog triggered restart." << std::endl;
							bot->Restart();
						}
						});
				}
			}
		}
		std::this_thread::sleep_for(std::chrono::milliseconds(50));
	}
	return 0;
}

////////////////
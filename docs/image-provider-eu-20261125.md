# A no-training image provider: Microsoft Foundry FLUX.2 (25 November 2026)

**Status:** built on the branch `feat/image-provider-eu`, which starts from `feat/image-editing` (the adapter must edit as well as create). Behind a config choice that defaults to today's provider. **No live request was made:** there is no Microsoft account or key. Every test uses a fake API.

## Which one, and why

**Chosen: Microsoft Foundry, FLUX.2 [pro], EU Data Zone.** Read from the providers' own pages on 25 November 2026:

| | Microsoft Foundry FLUX.2 [pro] | Google Vertex | Black Forest Labs direct (today) |
| --- | --- | --- | --- |
| Model | The same family the app uses now | **Imagen was retired on 30 June 2026**, including its mask-editing model. The replacement (Gemini image models) is retired yearly | FLUX.2 |
| Processing in the EU | Listed under "Data Zone Standard" for Sweden Central, Germany West Central and others: "may be processed in that or any other European Union Member Nation" | Only one model lists an `eu` multi-region | EU address exists; which models it serves is not documented |
| Training | "are NOT used to train any generative AI foundation models without your permission", "are NOT available to ... other providers of Models sold by Azure" | Not used for training without permission | **Their terms let them train on what is sent**; opt-out by email only |
| Editing | The same address with the picture added | Yes | Yes |
| Masks | **None documented** | None (the mask model was retired) | Two separate addresses; EU availability not documented |
| Key | One key | A service account with rotating tokens | One key |

Google was ruled out by the retirements. Microsoft is the same model, the same request fields, an EU data zone and a written no-training statement.

## Editing and masks

Your requirement was: it must support editing and masks.

- **Editing:** yes. An edit is the creation request with the picture added.
- **Masks:** the provider has no mask field. The app's own way covers it for every provider: the browser cuts a box around the painted part, sends only that box with the words, and pastes the answer back through the painted part. Nothing outside the painted part can change, which a browser test checks pixel by pixel (`tests/image-edit-ui.test.ts` on the image-editing branch). This was tried live against Black Forest Labs' FLUX.2 on 25 November and worked; Foundry serves the same model with the same fields.
- So Select area and Erase work with Foundry exactly as they do today. The switch `providerMasks` does nothing with Foundry.

## How to switch (when you have the Microsoft resource)

In `render-config.json`, inside `inference.imageCreation`:

```
"provider": "foundry",
"endpoint": "https://<your-resource>.api.cognitive.microsoft.com",
"model": "flux-2-pro",
"apiKeyFile": "/etc/secrets/image-api.key"
```

and put the Foundry key into that secret file. Without `"provider"` nothing changes: Black Forest Labs, as today. A config that names Foundry without an address, with a path in the address, or with another model is refused at start.

## What is not known until the first live request

1. **The shape of the answer.** Microsoft only says "a URL or base64-encoded image data". The adapter reads every shape these APIs use (five of them, plus asking again until ready) and checks that what comes back really is a JPEG, PNG or WebP. After the first live request the unused ones can be removed.
2. **The price.** Microsoft's price page shows no number for FLUX. The app's price list has FLUX.2 [pro] at EUR 0.028 an image (Black Forest Labs' list price); the cost shown in the usage scripts and the owner's dashboard is that estimate until you read the real price in the Azure portal.
3. **Whether the EU Data Zone can be chosen.** One Microsoft page lists it for FLUX.2 [pro]; another still says FLUX deploys "global standard" only. You will see it when you create the deployment. **If only Global is offered, the EU promise does not hold and this provider should not be used for friends.**
4. **Content filtering.** Microsoft says it provides no built-in content filter for FLUX at deployment. The app's own refusals (real, named people; minors with harmful content) run first, as today, and the model's own moderation answers are treated as a refusal.
5. **The address is marked "preview"**, and Microsoft says preview features "may employ different privacy practices". To raise with them before relying on the no-training statement.

## Your steps (only you can do them)

1. Create an Azure subscription and a Foundry resource in **Sweden Central or Germany West Central**; deploy **FLUX.2-pro** with deployment type **Data Zone Standard**. If that type is not offered, stop and tell the agent.
2. Read the price shown there and tell the agent (the price list gets a new version).
3. Ask Microsoft in writing whether the preview address is covered by the data statement above, and sign their Data Protection Addendum (it is part of the online terms).
4. Set a spending limit on the subscription.
5. Put the key into the Render secret file, change the config as above, deploy, and make one image and one edit with made-up content.
6. The Privacy Policy already lists Microsoft Foundry as a candidate; the lawyer's read fixes the final sentence naming it.

## Tests

`tests/image-foundry.test.ts` (6): address, key and body for creating and editing; every answer shape; the key only to the resource's own host; capacity and refusals; the endpoint rule; and the adapter behind the app's own routes, where a painted area arrives without a mask. Plus the config rules in `tests/deployment-inference-config.test.ts`.

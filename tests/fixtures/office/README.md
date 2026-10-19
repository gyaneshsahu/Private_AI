# Synthetic Word interoperability fixtures

Generated with python-docx1.2.0 using ../generate-docx.py. No real user data, network access or model generation. This is independent of PrivateAI's ZIP/XML fixture writer, but not a Microsoft Word or LibreOffice export certification. Regeneration may change ZIP metadata; content expectations are checked independently.

- handover-python-docx.docx: heading, split bold runs, strict UTC deadline, workshop precautions, table quantities/prices, missing tax/delivery data, automatic numbered paragraphs, header/footer omission markers.
- revision-python-docx.docx: unresolved inserted revision. Import must reject rather than merge ambiguous text.

The main package intentionally tests documented omissions: header/footer content and automatic list-number labels are not extracted. Numbered item text is retained. Body extraction must not invent page numbers. Expected critical text is checked in tests/docx.test.ts and the actual browser workflow. No answer-quality, privacy, accessibility or launch pass follows from these fixtures.

SHA256 of committed fixtures:

- handover-python-docx.docx: `7372a4a24b66614eacd69538fa20aca224630cbc99b4c842c35b89f5e7fa19bc`
- revision-python-docx.docx: `1ed14e91a16246e6e841929bae968f856aee054c0334f2b02e3b5364f5af468b`
